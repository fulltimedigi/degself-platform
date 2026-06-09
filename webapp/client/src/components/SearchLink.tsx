// A link that navigates to a hash route carrying query params, e.g.
// #/search?specialty=ميكانيكا — wouter's <Link> mis-handles query strings,
// so we render a plain anchor with an explicit hash href.
export function HashLink({
  to,
  className,
  children,
  testid,
}: {
  to: string; // e.g. "/search?specialty=..."
  className?: string;
  children: React.ReactNode;
  testid?: string;
}) {
  return (
    <a href={`#${to}`} className={className} data-testid={testid}>
      {children}
    </a>
  );
}
