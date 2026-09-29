import styles from "./Button.module.css";

interface ButtonProps {

    children: React.ReactNode;

    onClick?: () => void;

    variant?: "primary" | "secondary";

    type?: "button" | "submit";

    disabled?: boolean;

}

export function Button({
    children,
    onClick,
    variant = "primary",
    type = "button",
    disabled = false
}: ButtonProps) {

    return (

        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${styles.button} ${styles[variant]}`}
        >
            {children}
        </button>

    );

}