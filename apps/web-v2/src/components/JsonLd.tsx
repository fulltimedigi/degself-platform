/**
 * Renders a JSON-LD <script>. Google reads JSON-LD anywhere in the document.
 * "<" is escaped so the JSON can't break out of the <script> element.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
