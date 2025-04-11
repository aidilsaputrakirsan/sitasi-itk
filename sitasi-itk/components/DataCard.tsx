'use client';

import React from 'react';
import Link from 'next/link';

interface DataCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  linkHref: string;
  linkText: string;
  bgColor?: string;
}

export function DataCard({
  title,
  value,
  icon,
  linkHref,
  linkText,
  bgColor = 'bg-blue-100'
}: DataCardProps) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 ${bgColor} rounded-md p-3`}>
            {icon}
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd>
                <div className="text-lg font-medium text-gray-900">
                  {value}
                </div>
              </dd>
            </dl>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-4 sm:px-6">
        <div className="text-sm">
          <Link
            href={linkHref}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            {linkText}
          </Link>
        </div>
      </div>
    </div>
  );
}