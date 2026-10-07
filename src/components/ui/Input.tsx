import type { InputHTMLAttributes } from 'react'

/**
 * Wise input: 10px radius, 2px border, lime focus with dark-green ring.
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
}

export function Input({ error = false, className = '', ...props }: InputProps) {
    return (
        <input
            className={`h-11 w-full rounded-sm border-2 bg-surface px-3 py-2 text-base text-ink outline-none transition duration-150 ease-out placeholder:text-mute focus:border-primary focus:shadow-[0_0_0_3px_rgb(22_51_0/0.15)] disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-bone disabled:text-mute ${error ? 'border-danger text-danger' : 'border-border'
                } ${className}`}
            {...props}
            autoComplete='off'
        />
    )
}
