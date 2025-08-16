"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface HeaderProps {
  showBackButton?: boolean;
  title?: string;
}

export default function Header({ showBackButton = false, title }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            {showBackButton && !isHome && (
              <button
                type="button"
                onClick={() => router.back()}
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                ←
              </button>
            )}
            {title ? (
              <h1 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h1>
            ) : (
              <Link href="/">
                <h1 className="text-xl font-bold text-blue-600">kokkai-join</h1>
              </Link>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <button
              type="button"
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              🔍
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              ログイン
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
