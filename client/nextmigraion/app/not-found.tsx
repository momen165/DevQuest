/**
 * 404 Not Found Page
 * Original: src/pages/NotFoundPage.jsx
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: '2rem'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ marginBottom: '2rem' }}>Page Not Found</h2>
      <p style={{ marginBottom: '2rem' }}>The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" style={{
        padding: '0.75rem 1.5rem',
        backgroundColor: '#007bff',
        color: 'white',
        borderRadius: '0.5rem',
        textDecoration: 'none'
      }}>
        Go Home
      </Link>
    </div>
  );
}
