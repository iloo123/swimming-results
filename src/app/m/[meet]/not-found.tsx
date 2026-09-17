import Link from 'next/link';

export default function MeetNotFound() {
  return (
    <div className="empty-note">
      <p>That page is not part of this meet.</p>
      <p>
        <Link className="linkish" href="/">
          Open a meet
        </Link>
      </p>
    </div>
  );
}
