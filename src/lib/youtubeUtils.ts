/**
 * Converte qualquer URL do YouTube para o formato embed
 * Suporta:
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID (já está correto)
 * - https://youtube.com/shorts/VIDEO_ID
 */
export function convertToYouTubeEmbed(url: string): string {
  if (!url) return '';
  
  // Se já é embed, retorna como está
  if (url.includes('/embed/')) {
    return url;
  }
  
  let videoId: string | null = null;
  
  // Formato: youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
  if (shortMatch) {
    videoId = shortMatch[1];
  }
  
  // Formato: youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/);
  if (watchMatch) {
    videoId = watchMatch[1];
  }
  
  // Formato: youtube.com/shorts/VIDEO_ID
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/);
  if (shortsMatch) {
    videoId = shortsMatch[1];
  }
  
  if (videoId) {
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // Se não conseguiu parsear, retorna a URL original
  return url;
}
