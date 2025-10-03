"use client"

import React from 'react'; 
import { Grid2x2PlusIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from '@/components/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { MenuToggle } from '@/components/menu-toggle';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

export function SimpleHeader() {
    const [open, setOpen] = React.useState(false);

    const links = [
        {
            label: 'Features',
            href: '#features',
        },
        {
            label: 'Pricing',
            href: '#pricing',
        },
        {
            label: 'About',
            href: '#about',
        },
    ];

    return (
        <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 w-full border-b backdrop-blur-lg">
            <nav className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Grid2x2PlusIcon className="size-6" />
                    <p className="font-mono text-lg font-bold">Dodo Dev</p>
                </div>
                
                <div className="hidden items-center gap-2 lg:flex">
                    {links.map((link) => (
                        <a
                            key={link.label}
                            className={buttonVariants({ variant: 'ghost' })}
                            href={link.href}
                        >
                            {link.label}
                        </a>
                    ))}
                    
                    {/* Authentication Buttons */}
                    <SignedOut>
                        <SignInButton mode="modal">
                            <Button variant="outline">Sign In</Button>
                        </SignInButton>
                        <Button>Get Started</Button>
                    </SignedOut>
                    
                    <SignedIn>
                        <UserButton 
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8"
                                }
                            }}
                        />
                    </SignedIn>
                </div>

                {/* Mobile Menu */}
                <Sheet open={open} onOpenChange={setOpen}>
                    <Button size="icon" variant="outline" className="lg:hidden">
                        <MenuToggle
                            strokeWidth={2.5}
                            open={open}
                            onOpenChange={setOpen}
                            className="size-6"
                        />
                    </Button>
                    <SheetContent
                        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 gap-0 backdrop-blur-lg"
                        showClose={false}
                        side="left"
                    >
                        <div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
                            {links.map((link) => (
                                <a
                                    key={link.label}
                                    className={buttonVariants({
                                        variant: 'ghost',
                                        className: 'justify-start',
                                    })}
                                    href={link.href}
                                >
                                    {link.label}
                                </a>
                            ))}
                        </div>
                        <SheetFooter className="gap-2">
                            <SignedOut>
                                <SignInButton mode="modal">
                                    <Button variant="outline" className="w-full">Sign In</Button>
                                </SignInButton>
                                <Button className="w-full">Get Started</Button>
                            </SignedOut>
                            
                            <SignedIn>
                                <UserButton 
                                    appearance={{
                                        elements: {
                                            avatarBox: "w-8 h-8"
                                        }
                                    }}
                                />
                            </SignedIn>
                        </SheetFooter>
                    </SheetContent>
                </Sheet>
            </nav>
        </header>
    );
}
