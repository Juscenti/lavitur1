/**
 * Reusable skeleton placeholder with shimmer animation.
 * Use for loading states that match the eventual content layout.
 */
import '../styles/skeleton.css';

export function Skeleton({ className = '', style = {}, ...props }) {
  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={style}
      aria-hidden="true"
      {...props}
    />
  );
}

export default Skeleton;
