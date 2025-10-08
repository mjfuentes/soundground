/**
 * Upgrades SoundCloud image URLs to higher quality versions
 * Handles both .jpg and .png formats
 * 
 * Replaces patterns like:
 * - large.jpg/png → t500x500.jpg/png
 * - small.jpg/png → t500x500.jpg/png  
 * - t300x300.jpg/png → t500x500.jpg/png
 * 
 * @param url - The original image URL
 * @returns The upgraded URL with t500x500 resolution
 */
export function getHighQualityImage(url?: string): string | undefined {
  if (!url) return undefined;
  // Replace any size variant (-large, -small, -t300x300, etc.) with -t500x500
  // Preserves the original file extension (jpg or png)
  return url.replace(/-(large|small|t\d+x\d+)\.(jpg|png)/, "-t500x500.$2");
}

