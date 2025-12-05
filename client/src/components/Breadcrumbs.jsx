import { Link } from 'react-router-dom';

function Breadcrumbs({ items = [] }) {
    if (!items || items.length === 0) return null;

    return (
        <nav className="text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center gap-2">
                {items.map((it, idx) => (
                    <li key={idx} className="flex items-center">
                        {it.to ? (
                            <Link to={it.to} className="text-gray-600 hover:text-red-600">
                                {it.label}
                            </Link>
                        ) : (
                            <span className="text-gray-800 font-medium">{it.label}</span>
                        )}

                        {idx < items.length - 1 && <span className="mx-2">/</span>}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

export default Breadcrumbs;
