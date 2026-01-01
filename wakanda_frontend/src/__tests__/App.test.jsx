import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import axios from 'axios';
import '@testing-library/jest-dom';

jest.mock('axios');

describe('Wakanda OS Frontend Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        sessionStorage.setItem('wakanda_token', 'valid-test-token');
    });

    test('Renders Dashboard Title correctly', async () => {
        axios.get.mockResolvedValueOnce({ data: { role: 'CITIZEN' } });

        render(<App />);

        expect(await screen.findByText(/Wakanda Smart City OS/i)).toBeInTheDocument();
    });

    test('Redirects to Login if no token is present', () => {
        sessionStorage.removeItem('wakanda_token');

        render(<App />);

        expect(screen.queryByText(/Sistema Operativo Urbano/i)).not.toBeInTheDocument();
    });

    test('ServiceCard displays initial loading state', async () => {
        axios.get.mockResolvedValueOnce({ data: { role: 'CITIZEN' } });
        axios.get.mockImplementation((url) => {
            if (url.includes('/me')) return Promise.resolve({ data: {} });
            return new Promise(() => {});
        });

        render(<App />);

        const loadingElements = await screen.findAllByText(/Conectando sistemas.../i);
        expect(loadingElements.length).toBeGreaterThan(0);
    });

    test('ServiceCard renders props correctly', async () => {
        axios.get.mockResolvedValue({ data: { role: 'CITIZEN' } });

        render(<App />);

        expect(await screen.findByText('Gestión de Tráfico')).toBeInTheDocument();
        expect(screen.getByText('🚦')).toBeInTheDocument();
    });

    test('ServiceCard handles API errors gracefully', async () => {
        axios.get.mockImplementation((url) => {
            if (url.includes('/me')) return Promise.resolve({ data: {} });
            if (url.includes('/traffic/status')) {
                return Promise.reject({
                    response: { data: { message: 'Error de sensores' } }
                });
            }
            return Promise.resolve({ data: {} });
        });

        render(<App />);

        expect(await screen.findByText('Error de sensores')).toBeInTheDocument();
    });

    test('Refresh button triggers data fetch', async () => {
        axios.get.mockResolvedValue({ data: { role: 'CITIZEN', status: 'OK' } });

        render(<App />);
        await screen.findByText('Wakanda Smart City OS');

        const refreshButtons = screen.getAllByText('Actualizar');
        axios.get.mockClear();

        fireEvent.click(refreshButtons[0]);

        expect(axios.get).toHaveBeenCalledTimes(1);
    });

    test('Secret Club access attempts verification', async () => {
        axios.get.mockResolvedValue({ data: { role: 'CITIZEN' } });
        axios.post.mockResolvedValue({ data: { status: 'ok', view: 'rickmorty' } });

        render(<App />);
        await screen.findByText('Archivos Secretos');

        const input = screen.getByPlaceholderText('Código de Acceso');
        const button = screen.getByText('ACCEDER');

        fireEvent.change(input, { target: { value: 'WAKANDA-SECRET' } });
        fireEvent.click(button);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/clubs/verify'),
                { password: 'WAKANDA-SECRET' },
                expect.any(Object)
            );
        });
    });
});