<?php
/**
 * og.php — Social-share Open Graph handler for Navgrow.
 *
 * WHY THIS EXISTS
 * ---------------
 * Products and news posts created by admins live in the DATABASE, so they are not
 * part of the build-time prerender. Social crawlers (WhatsApp, Facebook, LinkedIn,
 * X) DO NOT run JavaScript, so when they fetch a DB-only URL they get the SPA
 * shell and never see the admin-uploaded image — the preview falls back to the
 * logo. This handler fixes that: for crawler requests to /shop/:slug or
 * /news/:slug, it fetches the record from the backend API and returns the shell
 * HTML with the correct Open Graph tags (title, description, and the real
 * uploaded image) injected. Human visitors are handed the normal SPA untouched.
 *
 * DEPLOYMENT
 * ----------
 * Uploaded automatically with the build (it lives in public/). The .htaccess
 * routes crawler hits on /shop/:slug and /news/:slug through this file. If a
 * prerendered static file already exists for the URL, that is served instead —
 * this only handles the DB-only case.
 *
 * It is intentionally dependency-free and fails safe: on any error it just serves
 * the normal shell so the site never breaks because of it.
 */

// ---- Config ---------------------------------------------------------------
$SITE   = 'https://navgrow.org';
// The backend is reachable at the site's own /api path (nginx/Apache proxies it
// to the Spring Boot app). On shared hosting the API is NOT on 127.0.0.1, so we
// build the public same-origin base from the incoming host and fall back through
// a few candidates. Override with the NAVGROW_API_BASE env var if needed.
$HOST = $_SERVER['HTTP_HOST'] ?? 'navgrow.org';
$API_CANDIDATES = array_values(array_filter([
    getenv('NAVGROW_API_BASE') ?: null,
    'https://' . $HOST . '/api',          // same-origin, proxied to backend
    'https://navgrow.org/api',            // explicit production
]));
$SHELL  = __DIR__ . '/index.html';
$FALLBACK_IMAGE = $SITE . '/og-share.jpg';
$TIMEOUT = 2.5; // seconds — keep crawlers fast; fall back to shell on timeout

// ---- Helpers --------------------------------------------------------------
function is_social_crawler($ua) {
    if (!$ua) return false;
    $bots = [
        'facebookexternalhit', 'facebot', 'whatsapp', 'linkedinbot', 'twitterbot',
        'slackbot', 'telegrambot', 'pinterest', 'redditbot', 'discordbot',
        'skypeuripreview', 'vkshare', 'w3c_validator', 'embedly', 'quora link preview',
        'showyoubot', 'outbrain', 'nuzzel', 'bitlybot', 'google-inspectiontool',
        'googlebot', 'bingbot', 'applebot', 'yandex'
    ];
    $ua = strtolower($ua);
    foreach ($bots as $b) { if (strpos($ua, $b) !== false) return true; }
    return false;
}

function http_get_json($url, $timeout) {
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => (int)ceil($timeout),
            CURLOPT_CONNECTTIMEOUT => (int)ceil($timeout),
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTPHEADER     => ['Accept: application/json'],
        ]);
        $body = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($body === false || $code < 200 || $code >= 300) return null;
        $j = json_decode($body, true);
        return is_array($j) ? $j : null;
    }
    // Fallback without cURL
    $ctx = stream_context_create(['http' => ['timeout' => $timeout, 'header' => "Accept: application/json\r\n"]]);
    $body = @file_get_contents($url, false, $ctx);
    if ($body === false) return null;
    $j = json_decode($body, true);
    return is_array($j) ? $j : null;
}

function e($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

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

function serve_shell($SHELL, $type = '', $slug = '') {
    // Prefer the PRERENDERED page for this slug if one exists (static products /
    // posts) -- it already has the correct Open Graph image. Only if there's no
    // prerendered file do we serve the bare SPA shell. This prevents a static
    // post from ever falling back to the generic share image.
    if ($type && $slug) {
        $dir = $type === 'product' ? 'shop' : 'news';
        $pre = __DIR__ . '/' . $dir . '/' . basename($slug) . '/index.html';
        if (is_readable($pre)) {
            header('Content-Type: text/html; charset=UTF-8');
            readfile($pre);
            exit;
        }
    }
    // Serve the untouched SPA shell (normal behaviour).
    if (is_readable($SHELL)) { header('Content-Type: text/html; charset=UTF-8'); readfile($SHELL); }
    else { http_response_code(404); echo 'Not found'; }
    exit;
}

// ---- Main -----------------------------------------------------------------
$ua = $_SERVER['HTTP_USER_AGENT'] ?? '';

// Non-crawlers always get the normal SPA shell.
if (!is_social_crawler($ua)) serve_shell($SHELL);

// Work out what was requested. The .htaccess passes ?type= & ?slug=, but we also
// derive from the path as a safety net.
$type = $_GET['type'] ?? '';
$slug = $_GET['slug'] ?? '';
if (!$type || !$slug) {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '', PHP_URL_PATH);
    if (preg_match('#/shop/([^/?#]+)#', $path, $m)) { $type = 'product'; $slug = $m[1]; }
    elseif (preg_match('#/news/([^/?#]+)#', $path, $m)) { $type = 'news'; $slug = $m[1]; }
}
$slug = trim($slug);
if (!$type || !$slug) serve_shell($SHELL);

// Fetch the record from the backend API (try each candidate base URL).
$endpoint = $type === 'product' ? "/products/" : "/news/";
$data = null;
foreach ($API_CANDIDATES as $base) {
    $data = http_get_json(rtrim($base, '/') . $endpoint . rawurlencode($slug), $TIMEOUT);
    if ($data) break;
}
if (!$data) serve_shell($SHELL, $type, $slug); // API unreachable / not found -> prerendered file or shell

// Build the OG fields from the record.
if ($type === 'product') {
    $ogType = 'product';
    $name   = $data['name'] ?? 'Product';
    $title  = $name . ' | Navgrow Engineering';
    $desc   = $data['summary'] ?? $data['description'] ?? ('Buy ' . $name . ' online with GST invoice and pan-India delivery.');
    $img    = $data['imageUrl'] ?? '';
    $url    = $SITE . '/shop/' . rawurlencode($slug);
    $price  = isset($data['price']) ? number_format((float)$data['price'], 2, '.', '') : null;
} else {
    $ogType = 'article';
    $title  = ($data['title'] ?? 'News') . ' | Navgrow News';
    $desc   = $data['excerpt'] ?? 'Latest from Navgrow Engineering.';
    $img    = $data['imageUrl'] ?? '';
    $url    = $SITE . '/news/' . rawurlencode($slug);
    $price  = null;
}
$desc = trim(preg_replace('/\s+/', ' ', strip_tags((string)$desc)));
if (strlen($desc) > 300) $desc = substr($desc, 0, 297) . '…';
$image = social_image($img, $SITE, $FALLBACK_IMAGE);

// Load the shell and inject/replace OG tags in <head>.
$html = is_readable($SHELL) ? file_get_contents($SHELL) : '<!doctype html><html><head></head><body></body></html>';

// Remove any existing OG/Twitter/canonical/title so ours win (avoid duplicates).
$html = preg_replace('#<title>.*?</title>#is', '', $html, 1);
$html = preg_replace('#<meta[^>]+property=["\']og:[^"\']+["\'][^>]*>#i', '', $html);
$html = preg_replace('#<meta[^>]+name=["\']twitter:[^"\']+["\'][^>]*>#i', '', $html);
$html = preg_replace('#<link[^>]+rel=["\']canonical["\'][^>]*>#i', '', $html);
$html = preg_replace('#<meta[^>]+name=["\']description["\'][^>]*>#i', '', $html, 1);

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
$tags .= '<meta property="og:image:width" content="1200"/>' . "\n";
$tags .= '<meta property="og:image:height" content="630"/>' . "\n";
$tags .= '<meta property="og:image:alt" content="' . e($title) . "\"/>\n";
if ($price !== null) {
    $tags .= '<meta property="product:price:amount" content="' . e($price) . "\"/>\n";
    $tags .= '<meta property="product:price:currency" content="INR"/>' . "\n";
}
$tags .= '<meta name="twitter:card" content="summary_large_image"/>' . "\n";
$tags .= '<meta name="twitter:title" content="' . e($title) . "\"/>\n";
$tags .= '<meta name="twitter:description" content="' . e($desc) . "\"/>\n";
$tags .= '<meta name="twitter:image" content="' . e($image) . "\"/>\n";

$html = preg_replace('#</head>#i', $tags . "</head>", $html, 1);

header('Content-Type: text/html; charset=UTF-8');
echo $html;
