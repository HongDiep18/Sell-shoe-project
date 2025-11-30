import { useEffect, useRef } from 'react';
import './App.css';
import Banner from './components/Banner';
import BlogHome from './components/BlogHome';
import Category from './components/Category';
import Chatbot from './components/ChatBot';
import Counpon from './components/Counpon';
import FeedbackHome from './components/FeedbackHome';
import FlashSale from './components/FlashSale';
import Footer from './components/Footer';
import Header from './components/Header';
import ModalChat from './components/chat/ModalChat';
import PersonalizedRecommendationsDebug from './components/PersonalizedRecommendationsDebug';
import TrendingProducts from './components/TrendingProducts';
import { trackUserActivity } from './config/UserActivityRequest';
import { useStore } from './hooks/useStore';

function App() {
    const sessionStartTime = useRef(Date.now());
    const pageViewsCount = useRef(0);

    useEffect(() => {
        // Track initial page view
        pageViewsCount.current += 1;

        // Track user activity on page load
        const sendActivity = async () => {
            try {
                await trackUserActivity({
                    pageViews: 1,
                    totalTimeSpent: 0,
                    deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                });
            } catch (error) {
                console.error('Failed to track activity:', error);
            }
        };

        sendActivity();

        // Track activity on page visibility change
        const handleVisibilityChange = () => {
            if (document.hidden) {
                const timeSpent = Math.floor((Date.now() - sessionStartTime.current) / 1000);
                trackUserActivity({
                    pageViews: pageViewsCount.current,
                    totalTimeSpent: timeSpent,
                    deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                }).catch(console.error);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // Track activity before page unload
        const handleBeforeUnload = () => {
            const timeSpent = Math.floor((Date.now() - sessionStartTime.current) / 1000);
            navigator.sendBeacon(
                `${import.meta.env.VITE_API_URL}/api/user-activity/track`,
                JSON.stringify({
                    pageViews: pageViewsCount.current,
                    totalTimeSpent: timeSpent,
                    deviceType: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                }),
            );
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    const { dataUser } = useStore();

    return (
        <div>
            <header>
                <Header />
            </header>

            <main>
                <Banner />
                <Counpon />
                <FlashSale />
                {dataUser._id && (
                    <>
                        <section className="py-12 bg-gradient-to-br from-purple-50 to-pink-50">
                            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                                <PersonalizedRecommendationsDebug limit={10} showDebug={true} />
                            </div>
                        </section>

                        {/* Trending Products */}
                        <section className="py-12">
                            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
                                <TrendingProducts limit={8} days={7} />
                            </div>
                        </section>
                    </>
                )}

                {/* AI-Powered Personalized Recommendations (PPO) with Debug Info */}

                <Category />
                <FeedbackHome />
                {/* <BlogHome /> */}
                <ModalChat />
                <Chatbot />
            </main>

            <footer>
                <Footer />
            </footer>
        </div>
    );
}

export default App;
