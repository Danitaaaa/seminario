import styles from "../../../styles/input.module.css";

interface InputProps 
extends React.InputHTMLAttributes<HTMLInputElement> {
}

export function Input(props: InputProps) {

    return (
        <input
            className={styles.input}
            {...props}
        />
    );

}