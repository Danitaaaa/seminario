import styles from "../../../styles/button.module.css";

interface ButtonProps {

    children: React.ReactNode;

    onClick?: () => void;

    variant?: "primary" | "secondary";

    type?: "button" | "submit";

    disabled?: boolean;
    autoFocus?: boolean;

}

export function Button({
    children,
    onClick,
    variant = "primary",
    type = "button",
    disabled = false,
    autoFocus = false
}: ButtonProps) {

    return (

        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            autoFocus={autoFocus}
            className={`${styles.button} ${styles[variant]}`}
        >
            {children}
        </button>

    );

}