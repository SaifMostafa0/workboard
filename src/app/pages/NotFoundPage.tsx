import { AlertCircle, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <AlertCircle className={styles.icon} aria-hidden="true" />
        <h1 className={styles.title}>Page Not Found</h1>
        <p className={styles.message}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link to="/" className={styles.link}>
          <Home className={styles.linkIcon} aria-hidden="true" />
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
