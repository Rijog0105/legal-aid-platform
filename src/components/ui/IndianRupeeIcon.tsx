import type { FC, SVGProps } from 'react';

interface IndianRupeeIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const IndianRupeeIcon: FC<IndianRupeeIconProps> = ({
  size = 18,
  className = '',
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M6 3h12" />
    <path d="M6 8h12" />
    <path d="M6 13l8.5 8" />
    <path d="M6 13h3a4.5 4.5 0 0 0 0-9" />
  </svg>
);
