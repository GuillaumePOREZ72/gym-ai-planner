import { Link } from "react-router-dom"

export default function Navbar() {
    return (
        <header>
           <div>
            <Link to="/">Home</Link>
            <Link to="/onboarding">Onboarding</Link>
            <Link to="/profile">Profile</Link>
            <Link to="/auth">Auth</Link>
            <Link to="/account">Account</Link>
           </div>
        </header>
    )
}