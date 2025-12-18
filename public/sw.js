const CACHE_NAME = 'tabunganku-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/share-target' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }
});

async function handleShareTarget(request) {
  const formData = await request.formData();
  const image = formData.get('image');
  const text = formData.get('text');
  const title = formData.get('title');
  
  const clients = await self.clients.matchAll({ type: 'window' });
  
  if (clients.length > 0) {
    const client = clients[0];
    
    if (image) {
      const imageData = await blobToBase64(image);
      client.postMessage({
        type: 'SHARE_TARGET',
        data: { image: imageData, text, title }
      });
    } else if (text) {
      client.postMessage({
        type: 'SHARE_TARGET',
        data: { text, title }
      });
    }
    
    await client.focus();
    return Response.redirect('/transactions/new?shared=true', 303);
  }
  
  return Response.redirect('/transactions/new', 303);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
