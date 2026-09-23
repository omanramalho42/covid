const { createProxyMiddleware } = require('http-proxy-middleware');

// Isso só funciona em desenvolvimento (npm start). O servidor de dev do CRA
// intercepta chamadas para /gho-api/* e as repassa para a API da OMS a
// partir do PRÓPRIO SERVIDOR (Node), não do navegador — então CORS nunca
// entra em cena, porque CORS é uma restrição do navegador, não do servidor.
module.exports = function (app) {
  app.use(
    '/gho-api',
    createProxyMiddleware({
      target: 'https://ghoapi.azureedge.net/api',
      changeOrigin: true,
      pathRewrite: { '^/gho-api': '' },
    })
  );
};