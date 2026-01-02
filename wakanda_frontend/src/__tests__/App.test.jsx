import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from '../App';
import axios from 'axios';
import '@testing-library/jest-dom';

jest.mock('axios');

describe('Wakanda OS Frontend Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        sessionStorage.setItem('wakanda_token', 'valid-test-token');

        axios.get.mockResolvedValue({ data: {} });
        axios.post.mockResolvedValue({ data: {} });
    });

    test('Renders Dashboard Title correctly', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/me')) return Promise.resolve({ data: { role: 'CITIZEN' } });
            return Promise.resolve({ data: { status: 'OK' } });
        });

        await act(async () => {
            render(<App />);
        });

        expect(await screen.findByText(/Wakanda Smart City OS/i)).toBeInTheDocument();
    });

    test('Redirects to Login if no token is present', async () => {
        sessionStorage.removeItem('wakanda_token');

        await act(async () => {
            render(<App />);
        });

        expect(screen.queryByText(/Sistema Operativo Urbano/i)).not.toBeInTheDocument();
    });

    test('ServiceCard displays initial loading state', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/me')) return Promise.resolve({ data: { role: 'CITIZEN' } });
            return new Promise(() => {});
        });

        render(<App />);

        const loadingElements = await screen.findAllByText(/Conectando sistemas.../i);
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    test('ServiceCard renders props correctly', async () => {
        axios.get.mockResolvedValue({ data: { role: 'CITIZEN', status: 'OK' } });

        await act(async () => {
            render(<App />);
        });

        expect(await screen.findByText('Gestión de Tráfico')).toBeInTheDocument();
        expect(screen.getByText('🚦')).toBeInTheDocument();
    });

    test('ServiceCard handles API errors gracefully', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/me')) return Promise.resolve({ data: { role: 'CITIZEN' } });
            if (url.includes('/traffic/status')) {
                return Promise.reject({
                    response: { data: { message: 'Error de sensores' } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        await act(async () => {
            render(<App />);
        });

        expect(await screen.findByText('Error de sensores')).toBeInTheDocument();
    });

    test('Refresh button triggers data fetch', async () => {
        axios.get.mockResolvedValue({ data: { role: 'CITIZEN', status: 'OK' } });

        await act(async () => {
            render(<App />);
        });

        await screen.findByText('Wakanda Smart City OS');

        const refreshButtons = screen.getAllByText('Actualizar');
        axios.get.mockClear();

        await act(async () => {
            fireEvent.click(refreshButtons[0]);
        });

        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('Secret Club access attempts verification', async () => {
        axios.get.mockResolvedValue({ data: { role: 'CITIZEN' } });
        axios.post.mockResolvedValue({ data: { status: 'ok', view: 'rickmorty' } });

        await act(async () => {
            render(<App />);
        });

        await screen.findByText('Archivos Secretos');

        const input = screen.getByPlaceholderText('Código de Acceso');
        const button = screen.getByText('ACCEDER');

        fireEvent.change(input, { target: { value: 'WAKANDA-SECRET' } });

        await act(async () => {
            fireEvent.click(button);
        });

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/clubs/verify'),
                { password: 'WAKANDA-SECRET' },
                expect.any(Object)
            );
        });
    });
});