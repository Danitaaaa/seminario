import styles from "./Button.module.css";

interface ButtonProps {

    children: React.ReactNode;

    onClick?: () => void;

    variant?: "primary" | "secondary";

    type?: "button" | "submit";

}

export function Button({
    children,
    onClick,
    variant = "primary",
    type = "button"
}: ButtonProps) {

    return (

        <button
            type={type}
            onClick={onClick}
            className={`${styles.button} ${styles[variant]}`}
        >
            {children}
        </button>

    );

}