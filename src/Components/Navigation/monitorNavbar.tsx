import { Store } from "lucide-react";
import type { NavigationLink } from "./Navigation";
import { Link } from "@tanstack/react-router";

export default function MonitorNavbar({navLinks}: {navLinks: NavigationLink[]}){
    return(
        <div className="min-h-18 grid grid-cols-2 grid-rows-1">
            <header id="left" className="inline-grid grid-cols-2 grid-rows-1 gap-8 max-w-sm">
                <header id="icon" className="flex justify-end items-center">
                    <Link to="/">
                        <Store height={36} width={36}></Store>
                    </Link>
                </header>
                <header id="title" className="flex justify-start items-center">
                    <span className="text-3xl text-[#0D2B45] font-bold font-stretch-semi-condensed">
                        <Link to="/">
                            MarketStack.Dashboard
                        </Link>
                    </span>
                </header> 
            </header>

            <div id="right" className="flex items-center justify-evenly w-full">
                {navLinks.map((item) => (
                    <div key={item.name} className="text-xl text-[#0D2B45]">
                        <Link key={item.name} to={item.link} className="data-[status=active]:border-b-2 border-b-[#1E5AA8]">{item.name}</Link>
                    </div>
                ))}  
            </div>
        </div>
    )
}