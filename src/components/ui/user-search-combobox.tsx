"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type User = {
  id: number;
  username: string;
  email: string | null;
}

interface UserSearchComboboxProps {
  value: string;
  onChange: (value: string) => void;
}

export function UserSearchCombobox({ value, onChange }: UserSearchComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [fetchedUsers, setFetchedUsers] = React.useState<User[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  // Fetch users on search with improved debouncing
  React.useEffect(() => {
    if (searchQuery.length < 2) {
      setFetchedUsers([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    const handler = setTimeout(() => {
      fetch(`/api/users?search=${encodeURIComponent(searchQuery)}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setFetchedUsers(data);
          } else {
            console.error("API did not return an array of users:", data);
            setFetchedUsers([]);
          }
        })
        .catch(error => {
          console.error("An error occurred while fetching users:", error);
          setFetchedUsers([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 200); // Reduced debounce time

    return () => clearTimeout(handler);
  }, [searchQuery]);


    // Keep selected user hydrated if value changes from parent
    React.useEffect(() => {
    if (value && value !== "" && !isNaN(Number(value))) {
        if (selectedUser && selectedUser.id.toString() === value) {
        return;
        }
        const userInList = fetchedUsers.find((u) => u.id.toString() === value);
        if (userInList) {
        setSelectedUser(userInList);
        } else {
        fetch(`/api/users/${value}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((user: User | null) => {
            if (user) setSelectedUser(user);
            })
            .catch(error => {
            console.error("Error fetching user by Id:", error);
            });
        }
    } else {
        setSelectedUser(null);
    }
    }, [value, fetchedUsers, selectedUser]);

  const displayValue = selectedUser ? selectedUser.username : "Select user...";

  const handleSelect = (selectedValue: string) => {
        onChange(selectedValue);
        setOpen(false);
        setSearchQuery("");
  };

  return (
    
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        align="start"
        onOpenAutoFocus={(e) => {
          setTimeout(() => {
            const target = e.currentTarget as HTMLElement | null;
            if (target) {
              const input = target.querySelector('input');
              if (input) {
                input.focus();
              }
            }
          }, 10);
        }}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by name"
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
            {searchQuery.length < 2 
                ? "Type at least 2 characters"
                : isLoading 
                ? "Searching..." 
                : fetchedUsers.length === 0 
                ? "No user found." 
                : null
            }
            </CommandEmpty>
            <CommandGroup>
              {fetchedUsers.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.username}
                  onSelect={() => handleSelect(user.id.toString())}      
                className="cursor-pointer hover:bg-accent data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                  style={{ pointerEvents: 'auto' }} // Force clickable
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === user.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <div>{user.username}</div>
                    {user.email && (
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}