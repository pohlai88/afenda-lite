import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { IconPlaceholder } from "@/features/auth/studio/icon-placeholder";
import { BorderBeam } from "@/components-V2/platform-components/ui/border-beam";
import AuthFullBackgroundShape from "@/features/auth/studio/auth-full-background-shape";
import LogoSvg from "@/features/auth/studio/logo-svg";
import { cn } from "@/lib/utils";

const AUTH_PREVIEW_LIGHT =
  "https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/auth/image-1.png";
const AUTH_PREVIEW_DARK =
  "https://cdn.shadcnstudio.com/ss-assets/blocks/marketing/auth/image-1-dark.png";

/**
 * Studio kit chrome for login-page-02 (SSOT layout DNA).
 * Production slots Neon AuthView via `children` — never mount demo `LoginForm`.
 * Must wrap with `.auth-surface` so `app/auth-surface.css` island tokens apply
 * (AdminCN customization: do not theme login via AdminCN `:root`).
 */
export function LoginPage02Chrome({
  children,
  brandName,
  backHref = "/",
  backLabel = "Back to the website",
  className,
}: {
  children: ReactNode;
  brandName: string;
  backHref?: string;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("auth-surface h-dvh lg:grid lg:grid-cols-6", className)}
      data-auth-island="studio"
      data-studio-block="login-page-02"
    >
      <div className="max-lg:hidden lg:col-span-3 xl:col-span-4">
        <div className="bg-muted relative z-1 flex h-full items-center justify-center px-6">
          <div className="outline-border relative shrink rounded-[20px] p-2.5 outline-2 -outline-offset-2">
            <Image
              src={AUTH_PREVIEW_LIGHT}
              alt=""
              width={880}
              height={560}
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="max-h-111 w-full rounded-lg object-contain dark:hidden"
            />
            <Image
              src={AUTH_PREVIEW_DARK}
              alt=""
              width={880}
              height={560}
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="hidden max-h-111 w-full rounded-lg object-contain dark:inline-block"
            />
            <BorderBeam
              duration={8}
              borderWidth={2}
              size={100}
              className="from-destructive via-primary to-transparent"
            />
          </div>
          <div className="absolute -z-1">
            <AuthFullBackgroundShape />
          </div>
        </div>
      </div>

      <div className="flex h-full flex-col items-center justify-center py-10 sm:px-5 lg:col-span-3 xl:col-span-2">
        <div className="w-full max-w-md px-6">
          <Link
            href={backHref}
            className="text-muted-foreground group mb-12 flex items-center gap-2 sm:mb-16 lg:mb-24"
          >
            <IconPlaceholder
              lucide="ChevronLeftIcon"
              tabler="IconChevronLeft"
              hugeicons="ArrowLeft01Icon"
              phosphor="CaretLeftIcon"
              remixicon="RiArrowLeftSLine"
              className="transition-transform duration-200 group-hover:-translate-x-0.5"
            />
            <p>{backLabel}</p>
          </Link>

          <div className="mb-6 flex items-center gap-2.5">
            <LogoSvg className="size-8.5" />
            <span className="text-xl font-bold">{brandName}</span>
          </div>

          <div className="flex flex-col gap-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Demo reference page — Storybook / kit preview only. Not used on production routes. */
const Login = () => {
  return (
    <LoginPage02Chrome brandName="shadcn/studio">
      <p className="text-muted-foreground text-sm">
        Kit preview — production mounts Neon AuthView via{" "}
        <code>features/auth</code>.
      </p>
    </LoginPage02Chrome>
  );
};

export default Login;
