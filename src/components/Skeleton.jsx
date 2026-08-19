import './Skeleton.css';

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line skeleton-badge" />
      <div className="skeleton-line skeleton-title" />
      <div className="skeleton-line skeleton-meta" />
      <div className="skeleton-line skeleton-text" />
      <div className="skeleton-line skeleton-text short" />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="skeleton-stat">
      <div className="skeleton-line skeleton-num" />
      <div className="skeleton-line skeleton-label" />
    </div>
  );
}