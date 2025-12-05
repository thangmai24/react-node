import React from "react";

const Button = ({
  children,
  loading = false,
  disabled = false,
  className = "",
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={loading || disabled}
      className={`
        relative
        flex items-center justify-center
        gap-2
        py-2 px-4
        rounded-lg
        font-medium
        text-white
        transition-all
        ${
          loading || disabled
            ? "opacity-60 cursor-not-allowed"
            : "hover:brightness-110"
        }
        ${className}
      `}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
