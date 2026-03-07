import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'accent' | 'ghost';
  isHoverable?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', isHoverable = false, children, ...props }, ref) => {
    const variants = {
      default: 'bg-card border-border',
      outline: 'bg-transparent border-border',
      accent: 'bg-card border-accent/20 shadow-[0_0_15px_rgba(163,230,53,0.05)]',
      ghost: 'bg-transparent border-transparent shadow-none',
    };

    const hoverStyles = isHoverable 
      ? 'transition-all duration-200 hover:border-accent/40 hover:shadow-md cursor-pointer' 
      : '';

    return (
      <div
        ref={ref}
        className={`rounded-xl border ${variants[variant]} ${hoverStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

const CardHeader = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props} />
);

const CardTitle = ({ className = '', ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-2xl font-semibold leading-none tracking-tight ${className}`} {...props} />
);

const CardDescription = ({ className = '', ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-sm text-muted ${className}`} {...props} />
);

const CardContent = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`p-6 pt-0 ${className}`} {...props} />
);

const CardFooter = ({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props} />
);

Card.displayName = 'Card';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
