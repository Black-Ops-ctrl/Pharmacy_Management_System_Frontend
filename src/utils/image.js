const MAX_SIDE = 1200;
const MAX_FILE = 15 * 1024 * 1024;

const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result));
  r.onerror = () => reject(new Error('Could not read the file.'));
  r.readAsDataURL(file);
});

const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('This file is not an image the browser can open.'));
  img.src = src;
});

const guessType = (name = '') => {
  const ext = name.split('.').pop().toLowerCase();
  return {
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', jfif: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
    svg: 'image/svg+xml', bmp: 'image/bmp', ico: 'image/x-icon', avif: 'image/avif', tif: 'image/tiff', tiff: 'image/tiff',
  }[ext] || '';
};

export async function imageFileToDataURL(file) {
  if (!file) throw new Error('Choose an image file.');
  if (file.size > MAX_FILE) throw new Error('The image is larger than 15 MB.');
  let url = await readAsDataUrl(file);
  if (!/^data:image\//i.test(url)) {
    const t = guessType(file.name);
    if (!t) throw new Error('Choose an image file.');
    url = url.replace(/^data:[^;,]*/i, `data:${t}`);
  }
  const img = await loadImage(url);
  const w = img.naturalWidth || 0, h = img.naturalHeight || 0;
  const keep = /^data:image\/(svg\+xml|gif|x-icon|vnd\.microsoft\.icon)/i.test(url);
  const scale = w && h ? Math.min(1, MAX_SIDE / Math.max(w, h)) : 1;
  if (!keep && scale < 1) {
    const c = document.createElement('canvas');
    c.width = Math.round(w * scale); c.height = Math.round(h * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const jpeg = /^data:image\/jpe?g/i.test(url);
    url = jpeg ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png');
    return { url, width: c.width, height: c.height, type: jpeg ? 'JPEG' : 'PNG' };
  }
  const type = (url.match(/^data:image\/([^;,]+)/i) || [])[1] || '';
  return { url, width: w, height: h, type: type.replace('svg+xml', 'SVG').replace('x-icon', 'ICO').toUpperCase() };
}
