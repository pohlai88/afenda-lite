import type { CSSProperties, ImgHTMLAttributes } from "react";

type ImageSrc = string | { src: string; width?: number; height?: number };

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  src: ImageSrc;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  unoptimized?: boolean;
};

function normalizeSrc(src: ImageSrc): string {
  if (typeof src === "string") {
    return src;
  }

  if (src && typeof src === "object" && "src" in src) {
    return src.src;
  }

  return "";
}

/** Storybook stub — serves portal brand paths via Storybook staticDirs (`public/`). */
export default function Image({
  src,
  alt,
  width,
  height,
  className,
  style,
  fill,
  priority: _priority,
  sizes: _sizes,
  unoptimized: _unoptimized,
  ...props
}: ImageProps) {
  const resolvedSrc = normalizeSrc(src);

  const fillStyle: CSSProperties | undefined = fill
    ? {
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        objectFit: "cover",
      }
    : undefined;

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={className}
      style={fillStyle ? { ...fillStyle, ...style } : style}
      decoding="async"
      {...props}
    />
  );
}
