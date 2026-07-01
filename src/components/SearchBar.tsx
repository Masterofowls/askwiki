import { useState, useRef, useEffect, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { autoComplete } from "@/services/wiki"

interface SearchBarProps {
  placeholder?: string
}

export default function SearchBar({ placeholder = "Search Wikipedia..." }: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const navigate = useNavigate()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  function handleInput(value: string) {
    setQuery(value)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (value.trim().length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const results = await autoComplete(value.trim())
        setSuggestions(results)
        setShowSuggestions(results.length > 0)
      } catch {
        // Silently fail - suggestions are optional
      }
    }, 200)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setShowSuggestions(false)
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  function selectSuggestion(suggestion: string) {
    setQuery(suggestion)
    setShowSuggestions(false)
    navigate(`/wiki/${encodeURIComponent(suggestion.replace(/ /g, "_"))}`)
  }

  return (
    <div className="search-bar-wrapper" ref={wrapperRef}>
      <form className="search-bar" onSubmit={handleSubmit} role="search">
        <span className="search-bar-icon">🔍</span>
        <input
          type="search"
          className="search-bar-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true)
          }}
          aria-label="Search articles"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="search-bar-clear"
            onClick={() => {
              setQuery("")
              setSuggestions([])
              setShowSuggestions(false)
            }}
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </form>

      {showSuggestions && suggestions.length > 0 && (
        <div className="search-autocomplete">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="search-autocomplete-item"
              onClick={() => selectSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
