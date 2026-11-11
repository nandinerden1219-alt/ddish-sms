import { imageUrl } from "@/lib/images";

type StorageImageProps = { path: string } & Omit<React.ComponentProps<"img">, "src">;

/** <img> for a file in the information-images bucket. Uploads are already
 *  shrunk client-side and served from Supabase's CDN, so next/image's
 *  optimizer (and its remotePatterns config) isn't needed here. */
export default function StorageImage({ path, alt = "", ...props }: StorageImageProps) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imageUrl(path)} alt={alt} {...props} />;
}
