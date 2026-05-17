
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/login"
  },
  {
    "renderMode": 2,
    "route": "/passenger"
  },
  {
    "renderMode": 2,
    "route": "/atc"
  },
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 589, hash: '456f634ae690476cf94f083088be6c5a88c87403cf0f361db96518abb4edc26f', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 991, hash: '847b2044db261ce0e577244f7e4d6c81310bd8e41fa9bc5be078e7a78b79dd56', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'passenger/index.html': {size: 240, hash: 'db096474d521163c4f5fb7d700305222bcea1012b38583442ad232da75e59192', text: () => import('./assets-chunks/passenger_index_html.mjs').then(m => m.default)},
    'atc/index.html': {size: 240, hash: 'db096474d521163c4f5fb7d700305222bcea1012b38583442ad232da75e59192', text: () => import('./assets-chunks/atc_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 4724, hash: '208dd3c0414a606ce0af5e49c50446c934b05f8a3fa40a9407d19e358a3b31e0', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'styles-OPSORIUJ.css': {size: 11072, hash: '+2rnD5E2+bg', text: () => import('./assets-chunks/styles-OPSORIUJ_css.mjs').then(m => m.default)}
  },
};
