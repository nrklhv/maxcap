/** Escape `<` so `</script>` in strings cannot break HTML parsing. */
function jsonLdStringify(schema: Record<string, unknown>) {
  return JSON.stringify(schema).replace(/</g, "\\u003c");
}

export function SeoJsonLd({ schema }: { schema: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdStringify(schema) }}
    />
  );
}
