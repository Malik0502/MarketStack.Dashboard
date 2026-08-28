import type { NavigationLink } from './Navigation';
import MonitorNavbar from './monitorNavbar';
import DisplayNavbar from './displayNavbar';
import { useMediaQuery } from './hooks/useMediaQuery';

const items: NavigationLink[] = [
    {name: 'Home', link: '/'},
    {name: 'Expenses', link: '/expenses'},
    {name: 'Prices', link: '/prices'},
    {name: 'Products', link: '/products'},
    {name: 'Stores', link: '/stores'},
] as const

export default function NavBar() {
    
    const isDesktop: boolean = useMediaQuery("(min-width: 1024px)");

    return isDesktop ? <MonitorNavbar navLinks={items} /> : <DisplayNavbar navLinks={items} />;
}

