import * as React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = "", glass = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`rounded-[2rem] border border-slate-900 bg-slate-950 p-6 shadow-xl ${
          glass ? "backdrop-blur-xl bg-slate-950/85" : ""
        } ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export const CardHeader = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex flex-col space-y-1.5 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={`text-lg font-black text-white tracking-tight ${className}`} {...props}>
    {children}
  </h3>
);

export const CardDescription = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={`text-xs text-slate-500 font-medium ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter = ({ className = "", children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={`flex items-center pt-4 border-t border-slate-900 mt-4 ${className}`} {...props}>
    {children}
  </div>
);
