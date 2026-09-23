import React from 'react'
import numeral from 'numeral'
import './Table.css'

const Table = ({ countries }) => {
  return (
    // Correção: <tr>/<td> soltos são HTML inválido fora de <table>/<tbody>
    <table className='table'>
      <tbody>
        {countries?.map(({ country, cases }, idx) => (
          <tr key={idx}>
            <td>{country}</td>
            <td>
              {/* Correção: format("") não formatava nada */}
              <strong>{numeral(cases).format("0,0")}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default Table