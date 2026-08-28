import { Menu, X, Store } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useState } from "react";
import type { NavigationLink } from "./Navigation"; 
import { Link } from "@tanstack/react-router";

export default function DisplayNavbar({navLinks}: {navLinks: NavigationLink[]}){
    const [open, setOpen] = useState(false);

    return(
        <div>
            <div className="flex items-center h-16 px-6">
                <header className="flex-1 flex items-center justify-center items-center gap-2">
                    <Store height={36} width={36} className=""/>

                    <span className="text-3xl text-[#0D2B45] font-bold font-stretch-semi-condensed">
                        <Link to="/">
                            MarketStack.Dashboard
                        </Link>
                    </span>
                </header>

                <div className="flex justify-end">
                    <button onClick={() => setOpen(!open)} className="relative h-8 w-8">
                        <motion.div className="absolute inset-0 flex items-center justify-center"animate={{opacity: open ? 0 : 1, rotate: open ? 90 : 0, scale: open ? 0.8 : 1,}} transition={{ duration: 0.2 }}>
                            <Menu color="#0D2B45"/>
                        </motion.div>
                
                        <motion.div className="absolute inset-0 flex items-center justify-center" animate={{opacity: open ? 1 : 0, rotate: open ? 0 : -90, scale: open ? 1 : 0.8,}} transition={{ duration: 0.2 }}>
                            <X color="#0D2B45"/>
                        </motion.div>
                    </button>
                </div>
            </div>

            <AnimatePresence>
                {open && (
                    <>
                        <motion.div className="fixed top-16 left-0 right-0 bottom-0 bg-black/40 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}/>

                        <motion.div className="flex gap-6 flex-col fixed top-16 right-0 bottom-0 w-full md:w-1/2 bg-white shadow-xl z-40" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "tween", duration: 0.3, ease: "easeOut"}}>
                            {navLinks.map((item) => (
                                <div key={item.name} className="flex text-2xl text-[#0D2B45] justify-center item-center p">
                                    <Link key={item.name} to={item.link} onClick={() => setOpen(false)} className="data-[status=active]:border-b-2 border-b-[#1E5AA8]">{item.name}</Link>
                                </div>
                            ))} 
                        
                        
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}