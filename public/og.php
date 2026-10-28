<?php
/**
 * og.php — server-rendered HTML for search engines and link previews on
 * products and news posts that exist only in the DATABASE.
 *
 * WHY THIS EXISTS
 * ---------------
 * Pages for admin-created products and posts are not prerendered at build time
 * (unless the build could reach the API), so crawlers would get the bare SPA
 * shell. For crawler requests to /shop/:slug or /news/:slug that have no
 * prerendered file, .htaccess routes here. This fetches the record from the
 * API and returns the SPA shell with, baked in:
 *   · the page's own title, description, canonical and Open Graph tags;
 *   · complete JSON-LD — Product with an Offer, or for a product sold in
 *     options a ProductGroup with one Product + Offer per option (each with its
 *     own ?variant= URL), real review ratings only; BlogPosting for news — plus
 *     a breadcrumb;
 *   · real, crawlable body text (name, price, every option, description).
 * The app still loads on top and replaces it, so the page is the same for
 * everyone once rendered. Mirrors src/lib/productSchema.js.
 *
 * Shell: dist/app.html — the neutral SPA fallback with NO canonical (the old
 * shell was the homepage's HTML, whose leftover tags and content made product
 * pages look like copies of the homepage).
 *
 * Fails safe: if the API can't be reached it serves the prerendered page or the
 * plain shell; if the API says the record doesn't exist it answers 404.
 * Dependency-free; works on PHP 7.2+.
 */

// ---- Config ---------------------------------------------------------------
$SITE = 'https://navgrow.org';
// The backend is reachable at the site's own /api path. Override with the
// NAVGROW_API_BASE env var if needed.
$HOST = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'navgrow.org';
$API_CANDIDATES = array_values(array_filter(array(
    getenv('NAVGROW_API_BASE') ?: null,
    'https://' . $HOST . '/api',          // same-origin, proxied to backend
    'https://navgrow.org/api',            // explicit production
)));
$SHELL = is_readable(__DIR__ . '/app.html') ? __DIR__ . '/app.html' : __DIR__ . '/index.html';
$FALLBACK_IMAGE = $SITE . '/og-share.jpg';
$TIMEOUT = 2.5; // seconds — keep crawlers fast; fall back to the shell on timeout

// ---- Helpers --------------------------------------------------------------
function is_crawler($ua) {
    if (!$ua) return false;
    $bots = array(
        // search engines (all Google crawlers, incl. the URL-inspection / rich-results tester)
        'googlebot', 'google-inspectiontool', 'googleother', 'storebot-google', 'adsbot-google',
        'mediapartners-google', 'apis-google', 'bingbot', 'bingpreview', 'msnbot', 'duckduckbot',
        'yandex', 'baiduspider', 'applebot', 'petalbot', 'seznambot', 'sogou', 'exabot',
        // link previews
        'facebookexternalhit', 'facebot', 'whatsapp', 'linkedinbot', 'twitterbot', 'slackbot',
        'telegrambot', 'pinterest', 'redditbot', 'discordbot', 'skypeuripreview', 'vkshare',
        'w3c_validator', 'embedly', 'quora link preview', 'showyoubot', 'outbrain', 'nuzzel', 'bitlybot',
    );
    $ua = strtolower($ua);
    foreach ($bots as $b) { if (strpos($ua, $b) !== false) return true; }
    return false;
}

/** array(httpStatus, decodedJsonOrNull). Status 0 = the API could not be reached. */
function http_get_json($url, $timeout) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, array(
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => (int)ceil($timeout),
            CURLOPT_CONNECTTIMEOUT => (int)ceil($timeout),
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER     => array('Accept: application/json'),
        ));
        $body = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false) return array(0, null);
        $j = json_decode($body, true);
        return array($code, ($code >= 200 && $code < 300 && is_array($j)) ? $j : null);
    }
    $ctx = stream_context_create(array('http' => array(
        'timeout' => $timeout, 'ignore_errors' => true, 'header' => "Accept: application/json\r\n")));
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return array(0, null);
    $code = 0;
    if (isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0] . ' ', $m)) $code = (int)$m[1];
    $j = json_decode($body, true);
    return array($code, ($code >= 200 && $code < 300 && is_array($j)) ? $j : null);
}

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function cut($s, $max) {
    if (function_exists('mb_strlen') && mb_strlen($s, 'UTF-8') > $max) return rtrim(mb_substr($s, 0, $max - 1, 'UTF-8')) . '…';
    if (!function_exists('mb_strlen') && strlen($s) > $max) return rtrim(substr($s, 0, $max - 1)) . '…';
    return $s;
}

/** Plain text: tags, markdown marks and runs of whitespace removed. */
function plain($s, $max) {
    $t = strip_tags((string)$s);
    $t = preg_replace('/[#*_`>]+/', ' ', $t);
    $t = trim(preg_replace('/\s+/u', ' ', $t));
    return cut($t, $max);
}

/** Newline-separated admin text → list items. */
function lines_of($s) {
    $out = array();
    foreach (preg_split('/\r?\n/', (string)$s) as $l) { $l = trim($l); if ($l !== '') $out[] = $l; }
    return $out;
}

/** ₹ with Indian digit grouping: 22000 → ₹22,000; 411.6 → ₹411.60. */
function inr($n) {
    $n = round((float)$n, 2);
    $int = (string)floor($n);
    $dec = (int)round(($n - floor($n)) * 100);
    $last3 = substr($int, -3);
    $rest = substr($int, 0, -3);
    $out = ($rest !== '' && $rest !== false)
        ? preg_replace('/\B(?=(\d{2})+(?!\d))/', ',', $rest) . ',' . $last3
        : $last3;
    if ($dec > 0) $out .= '.' . str_pad((string)$dec, 2, '0', STR_PAD_LEFT);
    return '₹' . $out;
}

/** Normalise an image URL: absolute stays; unsplash gets a 1200x630 social crop;
 *  relative is made absolute on the site domain; empty falls back to the brand card. */
function social_image($img, $SITE, $FALLBACK) {
    if (!$img) return $FALLBACK;
    if (strpos($img, 'images.unsplash.com') !== false) {
        $base = explode('?', $img)[0];
        return $base . '?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=630&q=80';
    }
    if (preg_match('#^https?://#i', $img)) return $img;
    if ($img[0] === '/') return $SITE . $img;
    return $FALLBACK;
}

function json_ld($data) {
    // Invalid UTF-8 in a database field used to make json_encode return false —
    // an EMPTY <script> block, reported by Google as "Unparsable structured data".
    $flags = JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE;
    if (defined('JSON_INVALID_UTF8_SUBSTITUTE')) $flags |= JSON_INVALID_UTF8_SUBSTITUTE;
    if (defined('JSON_PARTIAL_OUTPUT_ON_ERROR')) $flags |= JSON_PARTIAL_OUTPUT_ON_ERROR;
    $json = json_encode($data, $flags);
    if ($json === false || $json === '' || $json === 'null') return null;
    return str_replace('</', '<\/', $json);   // a stray "</script>" can't close the tag
}

/** Absolute URL for an image path; '' when there is none (never a placeholder). */
function abs_url($u, $SITE) {
    $u = trim((string)$u);
    if ($u === '') return '';
    if (preg_match('#^https?://#i', $u)) return $u;
    return $SITE . ($u[0] === '/' ? '' : '/') . $u;
}

function money2($n) { return number_format(round((float)$n, 2), 2, '.', ''); }

/** The value of a "Label: value" line in the specifications text whose label matches $re. */
function spec_value($text, $re) {
    foreach (lines_of($text) as $line) {
        $i = strpos($line, ':');
        if ($i === false || $i === 0) continue;
        $label = trim(substr($line, 0, $i));
        $value = trim(substr($line, $i + 1));
        if ($value !== '' && preg_match($re, $label)) return $value;
    }
    return '';
}

/** What an option name means to Google: brand, size, color, material, pattern — or null. */
function option_kind($name) {
    $n = trim((string)$name);
    if (preg_match('/^(brand|make|manufacturer|company)$/i', $n)) return 'brand';
    if (preg_match('/^(size|pack(ing|aging)?( size)?|pack|weight|net weight|diameter|dia|length|width|height|thickness|capacity|volume|gauge|bag size)$/i', $n)) return 'size';
    if (preg_match('/^(colou?r|shade)$/i', $n)) return 'color';
    if (preg_match('/^material$/i', $n)) return 'material';
    if (preg_match('/^(pattern|design)$/i', $n)) return 'pattern';
    return null;
}

/** The current build's prerendered page for a slug (pages from older uploads are ignored). */
function prerendered_page($type, $slug) {
    $build = @file_get_contents(__DIR__ . '/build-id.txt');
    $build = $build === false ? '' : preg_replace('/[^0-9A-Za-z_-]/', '', trim($build));
    if ($build === '') return null;
    $dir = $type === 'product' ? 'shop' : 'news';
    $p = __DIR__ . '/_p/' . $build . '/' . $dir . '/' . basename($slug) . '/index.html';
    return is_readable($p) ? $p : null;
}

function serve_shell($SHELL, $type = '', $slug = '', $status = 200) {
    // API unreachable: prefer THIS build's prerendered page for the slug — it has
    // complete tags. Never when the API said the record doesn't exist (a page
    // for a removed product must not stay indexed).
    if ($type && $slug && $status === 200) {
        $pre = prerendered_page($type, $slug);
        if ($pre) {
            header('Content-Type: text/html; charset=UTF-8');
            readfile($pre);
            exit;
        }
    }
    if ($status !== 200) {
        http_response_code($status);
        header('X-Robots-Tag: noindex');
    }
    if (is_readable($SHELL)) { header('Content-Type: text/html; charset=UTF-8'); readfile($SHELL); }
    else { http_response_code(404); echo 'Not found'; }
    exit;
}

// ---- Main -----------------------------------------------------------------
$ua = isset($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';

// Visitors always get the normal SPA shell.
if (!is_crawler($ua)) serve_shell($SHELL);

// What was requested? .htaccess passes ?type= & ?slug=; the path is a safety net.
$type = isset($_GET['type']) ? $_GET['type'] : '';
$slug = isset($_GET['slug']) ? $_GET['slug'] : '';
if (!$type || !$slug) {
    $path = parse_url(isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '', PHP_URL_PATH);
    if (preg_match('#/shop/([^/?#]+)#', (string)$path, $m)) { $type = 'product'; $slug = $m[1]; }
    elseif (preg_match('#/news/([^/?#]+)#', (string)$path, $m)) { $type = 'news'; $slug = $m[1]; }
}
$slug = trim(rawurldecode($slug));
if (($type !== 'product' && $type !== 'news') || $slug === '' || !preg_match('#^[A-Za-z0-9._~-]{1,200}$#', $slug)) {
    serve_shell($SHELL);
}

// Fetch the record from the API (try each candidate base URL).
$endpoint = $type === 'product' ? '/products/' : '/news/';
$data = null;
$notFound = false;
foreach ($API_CANDIDATES as $base) {
    list($code, $json) = http_get_json(rtrim($base, '/') . $endpoint . rawurlencode($slug), $TIMEOUT);
    if ($json) { $data = $json; break; }
    if ($code === 404) { $notFound = true; break; }   // the API answered: no such page
}
if (!$data) serve_shell($SHELL, $type, $slug, $notFound ? 404 : 200);

$seller = array('@type' => 'Organization', '@id' => $SITE . '/#organization', 'name' => 'Navgrow Engineering Service Pvt. Ltd.', 'url' => $SITE);
// The refund page's policy, written out in every Offer as in Google's examples
// (same as src/lib/productSchema.js; the Organization in index.html has it too).
$returnPolicy = array(
    '@type' => 'MerchantReturnPolicy', 'applicableCountry' => 'IN',
    'returnPolicyCategory' => 'https://schema.org/MerchantReturnFiniteReturnWindow',
    'merchantReturnDays' => 7, 'returnMethod' => 'https://schema.org/ReturnByMail',
);
$jsonld = array();
$bodyHtml = '';

if ($type === 'product') {
    $ogType = 'product';
    $name   = isset($data['name']) ? (string)$data['name'] : 'Product';
    $url    = $SITE . '/shop/' . rawurlencode($slug);
    $photo  = abs_url(isset($data['imageUrl']) ? $data['imageUrl'] : '', $SITE);   // the product's real photo, or none
    $image  = social_image(isset($data['imageUrl']) ? $data['imageUrl'] : '', $SITE, $FALLBACK_IMAGE);   // link previews only
    $unit   = isset($data['unitLabel']) ? trim((string)$data['unitLabel']) : '';
    $per    = $unit !== '' ? ' per ' . $unit : '';

    // Options (e.g. Cement by Brand × Grade): switched on and priced.
    $variants = array();
    if (!empty($data['variants']) && is_array($data['variants'])) {
        foreach ($data['variants'] as $v) {
            if (!is_array($v)) continue;
            if (isset($v['active']) && $v['active'] === false) continue;
            if (!isset($v['price']) || (float)$v['price'] <= 0) continue;
            $variants[] = $v;
        }
    }
    $optionNames = array();
    if (!empty($data['optionNames']) && is_array($data['optionNames'])) {
        foreach ($data['optionNames'] as $n) { if (trim((string)$n) !== '') $optionNames[] = trim((string)$n); }
    } else {
        foreach (array('option1Name', 'option2Name', 'option3Name') as $k) {
            if (!empty($data[$k])) $optionNames[] = trim((string)$data[$k]);
        }
    }
    $moqProduct = max(1, (int)(isset($data['minOrderQty']) ? $data['minOrderQty'] : 1));
    $active = !isset($data['active']) || $data['active'] !== false;
    $optionInStock = function ($v) use ($moqProduct, $active) {
        if (!$active) return false;
        if (isset($v['inStock']) && $v['inStock'] === true) return true;
        if (isset($v['inStock']) && $v['inStock'] === false) return false;
        $m = (int)(isset($v['minOrderQty']) ? $v['minOrderQty'] : 0);
        return (int)(isset($v['stockQty']) ? $v['stockQty'] : 0) >= max(1, $m > 0 ? $m : $moqProduct);
    };
    $available = false;
    if ($variants) {
        foreach ($variants as $v) { if ($optionInStock($v)) { $available = true; break; } }
    } else {
        $available = $active && (int)(isset($data['stockQty']) ? $data['stockQty'] : 0) >= $moqProduct;
    }
    $IN = 'https://schema.org/InStock'; $OUT = 'https://schema.org/OutOfStock'; $NEW = 'https://schema.org/NewCondition';
    $validUntil = date('Y-m-d', strtotime('+1 year'));

    $price = isset($data['price']) ? (float)$data['price'] : 0;
    $low = $price;
    $priceText = 'Price on request';
    if ($variants) {
        $prices = array();
        foreach ($variants as $v) $prices[] = (float)$v['price'];
        $low = min($prices); $high = max($prices);
        $priceText = ($low == $high ? inr($low) : inr($low) . ' – ' . inr($high)) . $per;
    } elseif ($price > 0) {
        $priceText = inr($price) . $per;
    }

    $summary = plain(isset($data['summary']) && $data['summary'] ? $data['summary'] : (isset($data['description']) ? $data['description'] : ''), 800);
    $title = $name . ' — Buy Online | Navgrow Engineering';
    $desc  = plain($name . ($low > 0 ? ' at ' . $priceText : '') . ' (incl. GST). ' . $summary
        . ' GST invoice with HSN, bulk prices and pan-India delivery.', 300);
    $description = plain(isset($data['summary']) && $data['summary'] ? $data['summary'] : (isset($data['description']) ? $data['description'] : $name), 5000);
    $specText = isset($data['specifications']) ? $data['specifications'] : '';
    $brandName = !empty($data['brand']) ? (string)$data['brand'] : spec_value($specText, '/^(brand|make|manufacturer|company)$/i');
    if ($brandName === '') $brandName = 'Navgrow Engineering';   // own label / unbranded goods

    // Genuine, approved reviews only — never a made-up rating.
    $rating = null;
    $rc = (int)(isset($data['reviewCount']) ? $data['reviewCount'] : 0);
    $rv = (float)(isset($data['rating']) ? $data['rating'] : 0);
    if ($rc > 0 && $rv > 0) {
        $rating = array('@type' => 'AggregateRating', 'ratingValue' => number_format(round($rv, 1), 1, '.', ''),
            'reviewCount' => $rc, 'bestRating' => '5', 'worstRating' => '1');
    }
    $props = array();
    if (!empty($data['hsnCode'])) $props[] = array('@type' => 'PropertyValue', 'name' => 'HSN Code', 'value' => (string)$data['hsnCode']);
    if (isset($data['gstRate']) && $data['gstRate'] !== null && $data['gstRate'] !== '') $props[] = array('@type' => 'PropertyValue', 'name' => 'GST Rate', 'value' => ((float)$data['gstRate'] + 0) . '%');
    if ($unit !== '') $props[] = array('@type' => 'PropertyValue', 'name' => 'Sold per', 'value' => $unit);

    $product = null;
    if ($variants) {
        // Sold in options → ProductGroup with one Product + Offer per option (Google's
        // product-variant markup; an AggregateOffer price range isn't accepted for
        // merchant listings). Each option has its own URL that preselects it.
        $shown = array_slice($variants, 0, 100);
        $kinds = array(); $usedKinds = array(); $distinct = array();
        foreach ($optionNames as $i => $n) {
            $k = option_kind($n);
            $kinds[$i] = ($k && !in_array($k, $usedKinds, true)) ? $k : null;
            if ($k && !in_array($k, $usedKinds, true)) $usedKinds[] = $k;
            $vals = array();
            foreach ($shown as $v) { $x = strtolower(trim((string)(isset($v['option' . ($i + 1)]) ? $v['option' . ($i + 1)] : ''))); if ($x !== '') $vals[$x] = true; }
            $distinct[$i] = count($vals);
        }
        // variesBy: only what really differs between the options, and only properties Google supports there.
        $variesBy = array(); $oneBrand = '';
        foreach ($kinds as $i => $k) {
            if ($k && $k !== 'brand' && $distinct[$i] > 1 && !in_array('https://schema.org/' . $k, $variesBy, true)) $variesBy[] = 'https://schema.org/' . $k;
            if ($k === 'brand' && $distinct[$i] === 1) $oneBrand = trim((string)$shown[0]['option' . ($i + 1)]);
        }
        $groupId = (string)(isset($data['sku']) && $data['sku'] ? $data['sku'] : $slug);
        $product = array(
            '@context' => 'https://schema.org', '@type' => 'ProductGroup', '@id' => $url . '#product',
            'name' => $name, 'url' => $url, 'description' => $description, 'productGroupID' => $groupId,
        );
        if ($variesBy) $product['variesBy'] = $variesBy;
        if ($photo !== '') $product['image'] = $photo;
        if (!empty($data['category'])) $product['category'] = (string)$data['category'];
        if (!in_array('brand', $usedKinds, true)) $product['brand'] = array('@type' => 'Brand', 'name' => $brandName);
        elseif ($oneBrand !== '') $product['brand'] = array('@type' => 'Brand', 'name' => $oneBrand);
        if ($rating) $product['aggregateRating'] = $rating;
        if ($props) $product['additionalProperty'] = $props;
        $hasVariant = array();
        foreach ($shown as $idx => $v) {
            $values = array();
            foreach ($optionNames as $i => $n) { $k = 'option' . ($i + 1); $values[$i] = isset($v[$k]) ? trim((string)$v[$k]) : ''; }
            $label = implode(' · ', array_values(array_filter($values, 'strlen')));
            $ref = !empty($v['sku']) ? (string)$v['sku'] : (!empty($v['id']) ? (string)$v['id'] : 'option-' . ($idx + 1));
            $vp = array('@type' => 'Product', 'name' => $label !== '' ? $name . ' — ' . $label : $name,
                'sku' => $ref, 'inProductGroupWithID' => $groupId);
            $vImage = abs_url(isset($v['imageUrl']) ? $v['imageUrl'] : '', $SITE);
            if ($vImage === '') $vImage = $photo;
            if ($vImage !== '') $vp['image'] = $vImage;
            $other = array();
            foreach ($values as $i => $val) {
                if ($val === '') continue;
                $k = isset($kinds[$i]) ? $kinds[$i] : null;
                if ($k === 'brand') $vp['brand'] = array('@type' => 'Brand', 'name' => $val);
                elseif ($k) $vp[$k] = $val;
                else $other[] = array('@type' => 'PropertyValue', 'name' => $optionNames[$i], 'value' => $val);
            }
            if ($other) $vp['additionalProperty'] = $other;
            $vp['offers'] = array(
                '@type' => 'Offer', 'url' => $url . '?variant=' . rawurlencode($ref), 'priceCurrency' => 'INR',
                'price' => money2($v['price']), 'priceValidUntil' => $validUntil,
                'availability' => $optionInStock($v) ? $IN : $OUT, 'itemCondition' => $NEW,
                'seller' => $seller, 'hasMerchantReturnPolicy' => $returnPolicy,
            );
            $hasVariant[] = $vp;
        }
        $product['hasVariant'] = $hasVariant;
    } else {
        $product = array(
            '@context' => 'https://schema.org', '@type' => 'Product', '@id' => $url . '#product',
            'name' => $name, 'url' => $url, 'description' => $description,
            'sku' => (string)(isset($data['sku']) && $data['sku'] ? $data['sku'] : $slug),
            'brand' => array('@type' => 'Brand', 'name' => $brandName),
        );
        if ($photo !== '') $product['image'] = $photo;
        if (!empty($data['category'])) $product['category'] = (string)$data['category'];
        if ($price > 0) {
            $product['offers'] = array(
                '@type' => 'Offer', 'url' => $url, 'priceCurrency' => 'INR', 'price' => money2($price),
                'priceValidUntil' => $validUntil, 'availability' => $available ? $IN : $OUT,
                'itemCondition' => $NEW, 'seller' => $seller, 'hasMerchantReturnPolicy' => $returnPolicy,
            );
        }
        if ($rating) $product['aggregateRating'] = $rating;
        if ($props) $product['additionalProperty'] = $props;
        // Google needs offers, review or aggregateRating — without any, no Product markup.
        if (!isset($product['offers']) && !isset($product['aggregateRating'])) $product = null;
    }
    $crumb = array(
        '@context' => 'https://schema.org', '@type' => 'BreadcrumbList', '@id' => $url . '#breadcrumb',
        'itemListElement' => array(
            array('@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => $SITE . '/'),
            array('@type' => 'ListItem', 'position' => 2, 'name' => 'Shop', 'item' => $SITE . '/shop'),
            array('@type' => 'ListItem', 'position' => 3, 'name' => $name, 'item' => $url),
        ),
    );
    $jsonld[] = $product ? array($product, $crumb) : array($crumb);

    // Crawlable body: name, price, every option, description, features, specs.
    $b  = '<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6">';
    $b .= '<p><a href="/">Home</a> › <a href="/shop">Shop</a>' . (!empty($data['category']) ? ' › ' . e($data['category']) : '') . '</p>';
    $b .= '<h1>' . e($name) . '</h1>';
    $b .= '<p><strong>Price: ' . e($priceText) . '</strong> (incl. GST)' . (!empty($data['hsnCode']) ? ' &middot; HSN ' . e($data['hsnCode']) : '') . '</p>';
    if (!empty($data['tagline'])) $b .= '<p><em>' . e($data['tagline']) . '</em></p>';
    if ($summary !== '') $b .= '<p>' . e($summary) . '</p>';
    if ($variants) {
        $b .= '<h2>' . e($name) . ' — all options &amp; prices</h2><table><thead><tr>';
        foreach ($optionNames as $n) $b .= '<th>' . e($n) . '</th>';
        $b .= '<th>Price' . e($per) . '</th><th>Availability</th></tr></thead><tbody>';
        foreach (array_slice($variants, 0, 80) as $v) {
            $b .= '<tr>';
            $ref = !empty($v['sku']) ? (string)$v['sku'] : (!empty($v['id']) ? (string)$v['id'] : '');
            foreach ($optionNames as $i => $n) {
                $k = 'option' . ($i + 1);
                $cell = e(isset($v[$k]) ? $v[$k] : '');
                $b .= '<td>' . ($i === 0 && $ref !== '' ? '<a href="/shop/' . e(rawurlencode($slug)) . '?variant=' . e(rawurlencode($ref)) . '">' . $cell . '</a>' : $cell) . '</td>';
            }
            $m = (int)(isset($v['minOrderQty']) ? $v['minOrderQty'] : 0);
            $ok = (int)(isset($v['stockQty']) ? $v['stockQty'] : 0) >= max(1, $m > 0 ? $m : $moqProduct);
            $b .= '<td>' . e(inr($v['price'])) . '</td><td>' . ($ok ? 'In stock' : 'On request') . '</td></tr>';
        }
        $b .= '</tbody></table>';
    }
    $long = plain(isset($data['description']) ? $data['description'] : '', 1500);
    if ($long !== '' && $long !== $summary) $b .= '<p>' . e($long) . '</p>';
    foreach (array('features' => 'Key features', 'specifications' => 'Specifications') as $k => $label) {
        $items = lines_of(isset($data[$k]) ? $data[$k] : '');
        if ($items) {
            $b .= '<h2>' . e($label) . '</h2><ul>';
            foreach (array_slice($items, 0, 30) as $it) $b .= '<li>' . e($it) . '</li>';
            $b .= '</ul>';
        }
    }
    $b .= '<h2>Buy ' . e($name) . ' online from Navgrow Engineering</h2><p>GST tax invoice with HSN for input-tax credit, bulk prices for larger quantities, request-for-quote for project requirements, and pan-India delivery (free within Siliguri; elsewhere charged by pincode at checkout). Call +91 89270 70972 or email info@navgrow.org.</p>';
    $b .= '</div>';
    $bodyHtml = $b;
} else {
    $ogType = 'article';
    $titleRaw = isset($data['title']) ? (string)$data['title'] : 'News';
    $title  = $titleRaw . ' | Navgrow News';
    $excerpt = plain(isset($data['excerpt']) && $data['excerpt'] ? $data['excerpt'] : (isset($data['content']) ? $data['content'] : ''), 300);
    $desc   = $excerpt !== '' ? $excerpt : 'Latest from Navgrow Engineering.';
    $image  = social_image(isset($data['imageUrl']) ? $data['imageUrl'] : '', $SITE, $FALLBACK_IMAGE);
    $url    = $SITE . '/news/' . rawurlencode($slug);
    $published = isset($data['publishedAt']) && $data['publishedAt'] ? $data['publishedAt'] : (isset($data['createdAt']) ? $data['createdAt'] : null);
    $modified  = isset($data['updatedAt']) && $data['updatedAt'] ? $data['updatedAt'] : $published;
    $post = array(
        '@context' => 'https://schema.org', '@type' => 'BlogPosting', '@id' => $url . '#article',
        'headline' => cut($titleRaw, 110), 'description' => $desc, 'image' => $image, 'url' => $url,
        'mainEntityOfPage' => array('@type' => 'WebPage', '@id' => $url),
        'author' => array('@type' => 'Organization', 'name' => 'Navgrow Engineering Service Pvt. Ltd.', 'url' => $SITE),
        'publisher' => array(
            '@type' => 'Organization', 'name' => 'Navgrow Engineering Service Pvt. Ltd.',
            'logo' => array('@type' => 'ImageObject', 'url' => $SITE . '/ng_logo.png'),
        ),
    );
    if ($published) $post['datePublished'] = $published;
    if ($modified)  $post['dateModified']  = $modified;
    $crumb = array(
        '@context' => 'https://schema.org', '@type' => 'BreadcrumbList', '@id' => $url . '#breadcrumb',
        'itemListElement' => array(
            array('@type' => 'ListItem', 'position' => 1, 'name' => 'Home', 'item' => $SITE . '/'),
            array('@type' => 'ListItem', 'position' => 2, 'name' => 'News', 'item' => $SITE . '/news'),
            array('@type' => 'ListItem', 'position' => 3, 'name' => $titleRaw, 'item' => $url),
        ),
    );
    $jsonld[] = array($post, $crumb);
    $content = plain(isset($data['content']) ? $data['content'] : '', 2500);
    $bodyHtml = '<div id="prerendered-seo-content" style="max-width:900px;margin:0 auto;padding:24px;font-family:system-ui,Arial,sans-serif;line-height:1.6"><article>'
        . '<p><a href="/">Home</a> › <a href="/news">News</a></p>'
        . '<h1>' . e($titleRaw) . '</h1>'
        . '<p><em>' . e(isset($data['category']) && $data['category'] ? $data['category'] : 'News') . ($published ? ' &middot; ' . e(substr((string)$published, 0, 10)) : '') . '</em></p>'
        . ($excerpt !== '' ? '<p>' . e($excerpt) . '</p>' : '')
        . ($content !== '' && $content !== $excerpt ? '<p>' . e($content) . '</p>' : '')
        . '</article></div>';
}

// ---- Assemble the page ----------------------------------------------------
$html = is_readable($SHELL) ? file_get_contents($SHELL) : '<!doctype html><html><head></head><body><div id="root"></div></body></html>';

// Remove whatever the shell carries for other pages, so ours win (no duplicates).
$html = preg_replace('#<title>.*?</title>#is', '', $html, 1);
$html = preg_replace('#<meta[^>]+property=["\']og:[^"\']+["\'][^>]*>#i', '', $html);
$html = preg_replace('#<meta[^>]+property=["\']product:[^"\']+["\'][^>]*>#i', '', $html);
$html = preg_replace('#<meta[^>]+name=["\']twitter:[^"\']+["\'][^>]*>#i', '', $html);
$html = preg_replace('#<link[^>]+rel=["\']canonical["\'][^>]*>#i', '', $html);
$html = preg_replace('#<link[^>]+hreflang=[^>]*>#i', '', $html);
$html = preg_replace('#<meta[^>]+name=["\']description["\'][^>]*>#i', '', $html, 1);
$html = preg_replace('#<script[^>]+id=["\']page-jsonld["\'][^>]*>.*?</script>#is', '', $html);

$tags  = "\n<title>" . e($title) . "</title>\n";
$tags .= '<meta name="description" content="' . e($desc) . "\"/>\n";
$tags .= '<link rel="canonical" href="' . e($url) . "\"/>\n";
$tags .= '<meta property="og:type" content="' . e($ogType) . "\"/>\n";
$tags .= '<meta property="og:site_name" content="Navgrow Engineering Service Pvt. Ltd."/>' . "\n";
$tags .= '<meta property="og:title" content="' . e($title) . "\"/>\n";
$tags .= '<meta property="og:description" content="' . e($desc) . "\"/>\n";
$tags .= '<meta property="og:url" content="' . e($url) . "\"/>\n";
$tags .= '<meta property="og:image" content="' . e($image) . "\"/>\n";
$tags .= '<meta property="og:image:secure_url" content="' . e($image) . "\"/>\n";
$tags .= '<meta property="og:image:alt" content="' . e($title) . "\"/>\n";
if ($type === 'product' && $low > 0) {
    $tags .= '<meta property="product:price:amount" content="' . e(number_format($low, 2, '.', '')) . "\"/>\n";
    $tags .= '<meta property="product:price:currency" content="INR"/>' . "\n";
}
$tags .= '<meta name="twitter:card" content="summary_large_image"/>' . "\n";
$tags .= '<meta name="twitter:title" content="' . e($title) . "\"/>\n";
$tags .= '<meta name="twitter:description" content="' . e($desc) . "\"/>\n";
$tags .= '<meta name="twitter:image" content="' . e($image) . "\"/>\n";
// Same script id the app uses, so it replaces (never duplicates) this markup.
foreach ($jsonld as $i => $block) {
    $json = json_ld($block);
    if ($json === null) continue;   // never an empty / unparsable block
    $tags .= '<script type="application/ld+json"' . ($i === 0 ? ' id="page-jsonld"' : '') . '>' . $json . "</script>\n";
}

$html = preg_replace('#</head>#i', $tags . '</head>', $html, 1);
if ($bodyHtml !== '' && strpos($html, '<div id="root"></div>') !== false) {
    $html = str_replace('<div id="root"></div>', '<div id="root">' . $bodyHtml . '</div>', $html);
}

header('Content-Type: text/html; charset=UTF-8');
echo $html;
