export default function Avatar({ user, size = 'md' }) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-[10px]',
    md: 'h-8 w-8 text-xs',
    lg: 'h-10 w-10 text-sm',
  };

  const name = user?.name || 'Unknown';
  const initial = name.charAt(0).toUpperCase();

  return (
    <div
      className={`rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border-2 border-white shadow-sm flex-shrink-0 ${sizeClasses[size]}`}
      title={name}
    >
      {initial}
    </div>
  );
}
