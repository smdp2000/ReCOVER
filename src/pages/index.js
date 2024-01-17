import Head from 'next/head'
import Link from 'next/link'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import Forecast from './forecast'
const inter = Inter({ subsets: ['latin'] })

export default function Home() {
    return (
      <Forecast/>
    )
}
