import React, { useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GlobalContext } from './GlobalProvider';
import { Stack } from "expo-router";

const AppContent = () => {
    const { playDataRef } = useContext(GlobalContext);

    useEffect(() => {
        const loadPlayData = async () => {
            try {
                const storedData = await AsyncStorage.getItem('playData');
                if (storedData) {
                    playDataRef.current = JSON.parse(storedData);
                }
            } catch (error) {
                console.error('加载播放数据失败:', error);
            }
        };

        loadPlayData();
    }, []);

    return (
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/sign-in" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/sign-up" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)/pw-reset" options={{ headerShown: false }} />
            <Stack.Screen name='(auth)/user-info' options={{ headerShown: false }} />
            <Stack.Screen name="search/[query]" options={{ headerShown: false }} />
            <Stack.Screen name='player/play-screen' options={{ headerShown: false }} />
            <Stack.Screen name='notifications/notice-screen' options={{ headerShown: false }} />
            <Stack.Screen name='view-user/index' options={{ headerShown: false }} />
        </Stack>
    );
};

export default AppContent;

