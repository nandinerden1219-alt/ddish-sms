// Trailing punctuation ("…uzeh bolomjtoi: https://youtu.be/x.") stays out of the link.
const URL_RE = /(https?:\/\/[^\s]*[^\s.,;:!?)\]'"])/g;

/** Text with bare URLs rendered as links. Clicking a link doesn't bubble, so a
 *  surrounding click-to-copy box opens the link without also copying. */
export default function Linkify({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) =>
        // split() with a capture group puts the matched URLs at odd indices.
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent-700 underline underline-offset-2 hover:text-accent-800"
          >
            {part}
          </a>
        ) : (
          part
        )
      )}
    </>
  );
}
