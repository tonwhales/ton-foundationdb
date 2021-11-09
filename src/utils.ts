import { createBackoff } from "teslabot";
import chalk from 'chalk';
import { format } from 'date-fns';

export const backoff = createBackoff({ onError: (e) => console.warn(e) });

export function log(src: any) {
    console.log(chalk.gray(format(Date.now(), 'yyyy-MM-dd HH:mm:ss')), src);
}

export function warn(src: any) {
    console.warn(chalk.gray(format(Date.now(), 'yyyy-MM-dd HH:mm:ss')), src);
}