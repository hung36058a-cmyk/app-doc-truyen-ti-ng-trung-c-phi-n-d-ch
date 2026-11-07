// ui/context.ts — Cho mọi màn hình truy cập các service (từ điển, AI, lưu trữ) mà không truyền qua props.

import { createContext } from 'preact';
import { useContext } from 'preact/hooks';
import type { Services } from '@/services/container';

export const ServicesContext = createContext<Services | null>(null);

export function useServices(): Services {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('ServicesContext chưa được cung cấp');
  return s;
}
