import { useEffect } from 'react';

const BASE     = 'Navgrow Engineering Service Pvt. Ltd.';
const BASE_DESC= 'DPIIT-recognised railway and government engineering firm in Siliguri, West Bengal. Loco modification, shed construction, safety compliance, government contracts.';
const BASE_URL = 'https://navgrow.org';

const useSeo = ({ title, description, path = '', image = '/ng_logo.png' } = {}) => {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${BASE}` : BASE;
    const desc      = description || BASE_DESC;
    const url       = BASE_URL + (path.startsWith('/') ? path : '/' + path);

    document.title = fullTitle;

    const setMeta = (key, val, attr = 'name') => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.content = val;
    };

    setMeta('description', desc);
    setMeta('og:title',       fullTitle, 'property');
    setMeta('og:description', desc,      'property');
    setMeta('og:url',         url,       'property');
    setMeta('og:image',       BASE_URL + image, 'property');
    setMeta('twitter:title',       fullTitle);
    setMeta('twitter:description', desc);

    let canon = document.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = url;
  }, [title, description, path, image]);
};

export default useSeo;
