"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileSpreadsheet, BookOpen, ClipboardList } from 'lucide-react';

const navItems = [
  { href: '/', label: '주간 성적표', icon: FileSpreadsheet },
  { href: '/internal-exam', label: '내신기출 성적표', icon: ClipboardList },
  { href: '/error-notes', label: '오답노트', icon: BookOpen },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b shadow-sm print:hidden">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-gray-800">양영학원</span>
            <span className="text-sm text-gray-500">성적관리</span>
          </div>
          <div className="flex gap-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
