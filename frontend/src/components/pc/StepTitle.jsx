import React from 'react';

export default function StepTitle({ title, children }) {
  return (
    <div className="mb-8 max-w-2xl">
      <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      {children && <p className="mt-3 leading-relaxed text-muted-foreground">{children}</p>}
    </div>
  );
}