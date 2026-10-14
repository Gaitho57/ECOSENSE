import React from 'react';

export default function CountdownBadge({ daysRemaining }) {
  if (daysRemaining === null || daysRemaining === undefined) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200">
        No Deadline Set
      </span>
    );
  }

  if (daysRemaining <= 0) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-gray-200 text-gray-700 border border-gray-300">
        ⚠️ Window Expired
      </span>
    );
  }

  if (daysRemaining < 10) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-700 border border-red-300 animate-pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
        🔥 Urgent: {daysRemaining} Day{daysRemaining === 1 ? '' : 's'} Left
      </span>
    );
  }

  if (daysRemaining <= 20) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-300">
        ⏳ {daysRemaining} Days Left
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
      ✓ {daysRemaining} Days Remaining
    </span>
  );
}
