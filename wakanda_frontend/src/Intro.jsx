import { useEffect, useRef, useState } from 'react';
import './Intro.css';
import introVideo from './assets/intro_wakanda.mp4';

export default function Intro({ onFinish }) {
    const videoRef = useRef(null);
    const [muted, setMuted] = useState(true);

    useEffect(() => {
        if(videoRef.current) {
            videoRef.current.play().catch(error => {
                console.log("Autoplay bloqueado por el navegador, esperando interacción", error);
            });
        }
    }, []);

    const toggleSound = () => {
        if(videoRef.current) {
            videoRef.current.muted = !videoRef.current.muted;
            setMuted(videoRef.current.muted);
        }
    };

    return (
        <div className="intro-container">
            <video
                ref={videoRef}
                src={introVideo}
                className="intro-video"
                autoPlay
                muted={muted}
                playsInline
                onEnded={onFinish}
            />

            <div className="intro-controls">
                <button className="intro-btn skip-btn" onClick={onFinish}>
                    Saltar intro
                </button>
            </div>
        </div>
    );
}