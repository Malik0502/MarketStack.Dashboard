export function ParseDateToMonthString(date: string): string 
{
    const monthNames = [
        "January", "February", "March",
        "April", "May", "June", "July",
        "August", "September", "October",
        "November", "December"
    ];

    // 0 is year && 1 is month
    const dateParts = date.split("-");

    if (dateParts.length != 3) {
        return "";
    }

    const month: string = monthNames[parseInt(dateParts[1])-1]
    const monthAbbr: string = month.substring(0, 3)

    const year: string = dateParts[0]
    const yearAbbr: string = year.substring(2, 4)

    return `${monthAbbr}/${yearAbbr}`
}