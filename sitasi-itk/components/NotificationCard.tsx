'use client';

import React from 'react';

interface NotificationCardProps {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  onMarkAsRead?: (id: string) => void;
}

export function NotificationCard({
  id,
  title,
  message,
  date,
  isRead,
  onMarkAsRead
}: NotificationCardProps) {
  return (
    <li className="border-b border-gray-200 last:border-b-0">
      <div className="px-4 py-4 sm:px-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${isRead ? 'text-gray-600' : 'text-blue-600'} truncate`}>
            {title}
          </p>
          <div className="ml-2 flex-shrink-0 flex">
            {!isRead && onMarkAsRead && (
              <button
                onClick={() => onMarkAsRead(id)}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
              >
                Mark as read
              </button>
            )}
            <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
              ${isRead ? 'bg-gray-100 text-gray-800' : 'bg-green-100 text-green-800'}`}>
              {isRead ? 'Read' : 'New'}
            </p>
          </div>
        </div>
        <div className="mt-2 sm:flex sm:justify-between">
          <div className="sm:flex">
            <p className="flex items-center text-sm text-gray-500">
              {message}
            </p>
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
            <svg
              className="flex-shrink-0 mr-1.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            <p>{date}</p>
          </div>
        </div>
      </div>
    </li>
  );
}